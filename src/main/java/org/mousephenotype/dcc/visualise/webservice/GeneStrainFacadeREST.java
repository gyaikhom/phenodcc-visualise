/*
 * Copyright 2013 Medical Research Council Harwell.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.mousephenotype.dcc.visualise.webservice;

import org.mousephenotype.dcc.visualise.persistence.MemcacheHandler;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.TypedQuery;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import org.mousephenotype.dcc.visualise.entities.GeneStrain;

/**
 * Web service for retrieving gene/strains.
 *
 * @author Gagarine Yaikhom <g.yaikhom@har.mrc.ac.uk>
 */
@Stateless
@Path("genestrains")
public class GeneStrainFacadeREST extends AbstractFacade<GeneStrain> {

    public GeneStrainFacadeREST() {
        super(GeneStrain.class);
    }

    private List<Integer> getGenotypeIds(String g) {
        List<String> items = Arrays.asList(g.split("\\s*,\\s*"));
        List<Integer> gids = new ArrayList<>();

        for (String geneId : items) {
            try {
                String[] fields = geneId.split("\\s*-\\s*");
                if (fields != null) {
                    /* We simplify things by returning all genes that matches
                     * the supplied genotype id. We discard the strain and
                     * centre information. Perhaps, we can make this more
                     * specific, but it is not really necessary as multiple
                     * genes with the same genotype id mostly occurs with
                     * baseline/wildtype genes, which is just a few. */
                    Integer v = Integer.parseInt(fields[0]);
                    if (v < 0) {
                        continue;
                    }
                    gids.add(v);
                }
            } catch (NumberFormatException e) {
            }
        }
        return gids;
    }

    List<GeneStrain> getAllGeneStrains() {
        MemcacheHandler mh = getMemcacheHandler();
        List<GeneStrain> genestrains = mh.getGeneStrains();
        if (genestrains == null) {
            EntityManager em = getEntityManager();
            TypedQuery<GeneStrain> query = em.createNamedQuery("GeneStrain.all",
                    GeneStrain.class);
            genestrains = query.getResultList();
            mh.setGeneStrains(genestrains);
        }
        return genestrains;
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public GeneStrainPack search(
            @QueryParam("q") String queryString,
            @QueryParam("g") String genotypeIds) {
        GeneStrainPack g = new GeneStrainPack();
        EntityManager em = getEntityManager();
        TypedQuery<GeneStrain> query = null;
        List<GeneStrain> genestrains = null;
        if (queryString == null || queryString.isEmpty()) {
            if (genotypeIds != null && !genotypeIds.isEmpty()) {
                List<Integer> gids = getGenotypeIds(genotypeIds);
                if (gids.isEmpty()) {
                    genestrains = getAllGeneStrains();
                } else {
                    query = em.createNamedQuery("GeneStrain.selected",
                            GeneStrain.class);
                    query.setParameter("gids", gids);
                }
            } else {
                genestrains = getAllGeneStrains();
            }
            if (genestrains == null) {
                if (query != null) {
                    g.setDataSet(query.getResultList());
                }
            } else {
                g.setDataSet(genestrains);
            }
        } else {
            query = em.createNamedQuery("GeneStrain.search", GeneStrain.class);
            query.setParameter("queryString", "%" + queryString + "%");
            g.setDataSet(query.getResultList());
        }
        em.close();
        return g;
    }
}
