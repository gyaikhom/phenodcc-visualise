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

import java.util.List;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlSeeAlso;
import javax.xml.bind.annotation.XmlType;
import org.mousephenotype.dcc.visualise.entities.GeneStrain;

/**
 * Response package for gene/strain data returned by the 
 * GeneStrainFacadeREST web service.
 * 
 * @author Gagarine Yaikhom <g.yaikhom@har.mrc.ac.uk>
 */
@XmlSeeAlso(GeneStrain.class)
@XmlType(propOrder = {"success", "total", "genestrains"})
public class GeneStrainPack extends AbstractRestResponse<GeneStrain> {

    @Override
    @XmlElement(name = "genestrains")
    public List<GeneStrain> getDataSet() {
        return super.getDataSet();
    }
}
