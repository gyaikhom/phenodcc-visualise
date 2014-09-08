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
import org.mousephenotype.dcc.entities.overviews.MeasuredValues;
import org.mousephenotype.dcc.entities.overviews.MetadataGroupToValues;

/**
 * Response package for measurements data returned by the 
 * MeasurementsFacadeREST web service.
 *
 * @author Gagarine Yaikhom <g.yaikhom@har.mrc.ac.uk>
 */
@XmlSeeAlso(MeasuredValues.class)
@XmlType(propOrder = {"success", "total", "measurements"})
public class MeasurementsPack extends AbstractRestResponse<MeasuredValues> {
    private final int QC_DONE = 0;    
    private int qcStatus = QC_DONE;
    private List<MetadataGroupToValues> metadataGroups;

    public int getQcStatus() {
        return qcStatus;
    }

    public void setQcStatus(int qcStatus) {
        this.qcStatus = qcStatus;
    }

    public List<MetadataGroupToValues> getMetadataGroups() {
        return metadataGroups;
    }

    public void setMetadataGroups(List<MetadataGroupToValues> metadataGroups) {
        this.metadataGroups = metadataGroups;
    }
    
    @Override
    @XmlElement(name = "measurements")
    public List<MeasuredValues> getDataSet() {
        return super.getDataSet();
    }
}
